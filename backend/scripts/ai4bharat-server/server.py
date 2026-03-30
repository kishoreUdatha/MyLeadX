"""
AI4Bharat Voice Server

Self-hosted server for IndicWhisper (STT) and IndicTTS (TTS)
Provides REST API compatible with VoiceBridge backend.

Usage:
    python server.py                    # Run on default port 5050
    python server.py --port 8080        # Run on custom port
    python server.py --gpu              # Use GPU acceleration

Requirements:
    pip install -r requirements.txt
"""

import os
import io
import argparse
import logging
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import numpy as np
import torch
import soundfile as sf

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

# Global model instances
whisper_model = None
tts_models = {}

# Supported languages
SUPPORTED_LANGUAGES = {
    'te': 'Telugu',
    'hi': 'Hindi',
    'ta': 'Tamil',
    'kn': 'Kannada',
    'ml': 'Malayalam',
    'bn': 'Bengali',
    'mr': 'Marathi',
    'gu': 'Gujarati',
    'pa': 'Punjabi',
    'or': 'Odia',
    'as': 'Assamese',
}

# IndicTTS voice mapping
TTS_VOICES = {
    'te': {'female': 'tel_female', 'male': 'tel_male'},
    'hi': {'female': 'hin_female', 'male': 'hin_male'},
    'ta': {'female': 'tam_female', 'male': 'tam_male'},
    'kn': {'female': 'kan_female', 'male': 'kan_male'},
    'ml': {'female': 'mal_female', 'male': 'mal_male'},
    'bn': {'female': 'ben_female', 'male': 'ben_male'},
    'mr': {'female': 'mar_female', 'male': 'mar_male'},
    'gu': {'female': 'guj_female', 'male': 'guj_male'},
}


def load_whisper_model(use_gpu=False):
    """Load IndicWhisper model"""
    global whisper_model

    try:
        import whisper

        device = "cuda" if use_gpu and torch.cuda.is_available() else "cpu"
        logger.info(f"Loading IndicWhisper model on {device}...")

        # Use OpenAI Whisper large-v3 (best for Indian languages)
        # Or use AI4Bharat's fine-tuned model if available
        whisper_model = whisper.load_model("large-v3", device=device)

        logger.info("IndicWhisper model loaded successfully")
        return True
    except Exception as e:
        logger.error(f"Failed to load Whisper model: {e}")
        return False


def load_tts_model(language, gender, use_gpu=False):
    """Load IndicTTS model for specific language and gender"""
    global tts_models

    key = f"{language}_{gender}"
    if key in tts_models:
        return tts_models[key]

    try:
        from TTS.api import TTS

        device = "cuda" if use_gpu and torch.cuda.is_available() else "cpu"
        logger.info(f"Loading TTS model for {language} ({gender}) on {device}...")

        # Use Coqui TTS with XTTS for multilingual support
        # This model supports Indian languages
        model = TTS("tts_models/multilingual/multi-dataset/xtts_v2")
        model.to(device)

        tts_models[key] = model
        logger.info(f"TTS model loaded for {language} ({gender})")
        return model
    except Exception as e:
        logger.error(f"Failed to load TTS model: {e}")
        return None


@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    models = []
    if whisper_model is not None:
        models.append('indicwhisper')
    if tts_models:
        models.append('indictts')

    return jsonify({
        'status': 'ok' if models else 'no_models',
        'models': models,
        'languages': list(SUPPORTED_LANGUAGES.keys()),
        'gpu_available': torch.cuda.is_available(),
    })


@app.route('/transcribe', methods=['POST'])
def transcribe():
    """
    Transcribe audio using IndicWhisper

    Expects:
        - audio: WAV file (multipart/form-data)
        - language: Language code (e.g., 'te', 'hi')
        - sample_rate: Audio sample rate (default: 16000)

    Returns:
        - text: Transcribed text
        - language: Detected/specified language
        - confidence: Confidence score (if available)
    """
    if whisper_model is None:
        return jsonify({'error': 'Whisper model not loaded'}), 503

    try:
        # Get audio file
        if 'audio' not in request.files:
            return jsonify({'error': 'No audio file provided'}), 400

        audio_file = request.files['audio']
        language = request.form.get('language', None)

        # Read audio
        audio_bytes = audio_file.read()

        # Save to temp file (Whisper requires file path)
        import tempfile
        with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as tmp:
            tmp.write(audio_bytes)
            tmp_path = tmp.name

        try:
            # Transcribe
            options = {}
            if language and language in SUPPORTED_LANGUAGES:
                options['language'] = language

            result = whisper_model.transcribe(tmp_path, **options)

            return jsonify({
                'text': result['text'].strip(),
                'language': result.get('language', language),
                'segments': [
                    {
                        'start': seg['start'],
                        'end': seg['end'],
                        'text': seg['text'],
                    }
                    for seg in result.get('segments', [])
                ],
            })
        finally:
            os.unlink(tmp_path)

    except Exception as e:
        logger.error(f"Transcription error: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/synthesize', methods=['POST'])
def synthesize():
    """
    Synthesize speech using IndicTTS

    Expects (JSON body):
        - text: Text to synthesize
        - language: Language code (e.g., 'te', 'hi')
        - gender: 'male' or 'female'
        - sample_rate: Output sample rate (default: 22050)

    Returns:
        - WAV audio file
    """
    try:
        data = request.json
        if not data:
            return jsonify({'error': 'No JSON body provided'}), 400

        text = data.get('text', '')
        language = data.get('language', 'te')
        gender = data.get('gender', 'female')
        sample_rate = data.get('sample_rate', 22050)

        if not text:
            return jsonify({'error': 'No text provided'}), 400

        if language not in SUPPORTED_LANGUAGES:
            return jsonify({'error': f'Language {language} not supported'}), 400

        # Load TTS model
        tts_model = load_tts_model(language, gender, use_gpu=args.gpu if 'args' in dir() else False)
        if tts_model is None:
            return jsonify({'error': 'TTS model not available'}), 503

        # Generate speech
        # XTTS requires a speaker reference, use built-in speaker
        wav = tts_model.tts(
            text=text,
            language=language,
        )

        # Convert to numpy array if needed
        if isinstance(wav, list):
            wav = np.array(wav)

        # Resample if needed
        if sample_rate != 22050:
            from scipy import signal
            num_samples = int(len(wav) * sample_rate / 22050)
            wav = signal.resample(wav, num_samples)

        # Create WAV file in memory
        buffer = io.BytesIO()
        sf.write(buffer, wav, sample_rate, format='WAV', subtype='PCM_16')
        buffer.seek(0)

        return send_file(
            buffer,
            mimetype='audio/wav',
            as_attachment=True,
            download_name='speech.wav'
        )

    except Exception as e:
        logger.error(f"TTS error: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/translate', methods=['POST'])
def translate():
    """
    Translate text between Indian languages using IndicTrans

    Expects (JSON body):
        - text: Text to translate
        - source_language: Source language code
        - target_language: Target language code

    Returns:
        - translation: Translated text
    """
    try:
        data = request.json
        if not data:
            return jsonify({'error': 'No JSON body provided'}), 400

        text = data.get('text', '')
        source_lang = data.get('source_language', 'en')
        target_lang = data.get('target_language', 'te')

        if not text:
            return jsonify({'error': 'No text provided'}), 400

        # For now, return a placeholder
        # Full IndicTrans integration would require the model
        logger.warning("Translation not fully implemented - returning original text")

        return jsonify({
            'translation': text,
            'source_language': source_lang,
            'target_language': target_lang,
            'note': 'Translation model not loaded',
        })

    except Exception as e:
        logger.error(f"Translation error: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/voices', methods=['GET'])
def list_voices():
    """List available voices"""
    voices = []
    for lang, lang_name in SUPPORTED_LANGUAGES.items():
        if lang in TTS_VOICES:
            for gender in ['female', 'male']:
                voices.append({
                    'id': f'ai4bharat-{lang}-{gender}',
                    'name': f'{lang_name} {gender.capitalize()}',
                    'language': lang,
                    'gender': gender,
                })

    return jsonify({'voices': voices})


def main():
    global args

    parser = argparse.ArgumentParser(description='AI4Bharat Voice Server')
    parser.add_argument('--port', type=int, default=5050, help='Port to run server on')
    parser.add_argument('--host', type=str, default='0.0.0.0', help='Host to bind to')
    parser.add_argument('--gpu', action='store_true', help='Use GPU acceleration')
    parser.add_argument('--no-whisper', action='store_true', help='Skip loading Whisper model')
    parser.add_argument('--no-tts', action='store_true', help='Skip loading TTS models')

    args = parser.parse_args()

    logger.info(f"Starting AI4Bharat Voice Server on {args.host}:{args.port}")
    logger.info(f"GPU: {'enabled' if args.gpu else 'disabled'}")

    # Load models
    if not args.no_whisper:
        load_whisper_model(use_gpu=args.gpu)

    # TTS models are loaded on-demand

    # Run server
    app.run(host=args.host, port=args.port, debug=False)


if __name__ == '__main__':
    main()
