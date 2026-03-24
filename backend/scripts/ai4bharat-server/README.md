# AI4Bharat Voice Server

Self-hosted server for Indian language voice AI using AI4Bharat's open-source models.

## Features

- **IndicWhisper** - Speech-to-Text for 11 Indian languages
- **IndicTTS** - Text-to-Speech for 8 Indian languages
- **IndicTrans** - Translation between Indian languages (optional)

## Supported Languages

| Language | STT | TTS | Code |
|----------|-----|-----|------|
| Telugu | ✅ | ✅ | `te` |
| Hindi | ✅ | ✅ | `hi` |
| Tamil | ✅ | ✅ | `ta` |
| Kannada | ✅ | ✅ | `kn` |
| Malayalam | ✅ | ✅ | `ml` |
| Bengali | ✅ | ✅ | `bn` |
| Marathi | ✅ | ✅ | `mr` |
| Gujarati | ✅ | ✅ | `gu` |
| Punjabi | ✅ | ❌ | `pa` |
| Odia | ✅ | ❌ | `or` |
| Assamese | ✅ | ❌ | `as` |

## Quick Start

### 1. Install Dependencies

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # Linux/Mac
# or
.\venv\Scripts\activate  # Windows

# Install requirements
pip install -r requirements.txt
```

### 2. Run Server

```bash
# CPU mode (slower but works on any machine)
python server.py

# GPU mode (faster, requires NVIDIA GPU)
python server.py --gpu

# Custom port
python server.py --port 8080
```

### 3. Configure VoiceBridge

Add to your `backend/.env`:

```env
AI4BHARAT_BASE_URL=http://localhost:5050
STT_PROVIDER=ai4bharat  # or 'auto' to use as fallback
```

## API Endpoints

### Health Check
```
GET /health
```

### Transcribe (STT)
```
POST /transcribe
Content-Type: multipart/form-data

Parameters:
- audio: WAV file
- language: Language code (e.g., 'te', 'hi')
- sample_rate: Audio sample rate (default: 16000)
```

### Synthesize (TTS)
```
POST /synthesize
Content-Type: application/json

{
  "text": "నమస్కారం",
  "language": "te",
  "gender": "female",
  "sample_rate": 8000
}
```

### List Voices
```
GET /voices
```

## Hardware Requirements

### Minimum (CPU only)
- 8GB RAM
- 10GB disk space
- Any modern CPU

### Recommended (GPU)
- 16GB RAM
- 12GB VRAM (RTX 3080 or better)
- 20GB disk space

## Docker Deployment

```dockerfile
FROM python:3.10-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY server.py .
EXPOSE 5050

CMD ["python", "server.py", "--host", "0.0.0.0"]
```

Build and run:
```bash
docker build -t ai4bharat-server .
docker run -p 5050:5050 ai4bharat-server

# With GPU
docker run --gpus all -p 5050:5050 ai4bharat-server python server.py --gpu
```

## Cloud Deployment

### RunPod (Recommended for GPU)

1. Create a new pod with RTX 3090 or A100
2. Select PyTorch template
3. SSH into pod and run:

```bash
git clone <your-repo>
cd ai4bharat-server
pip install -r requirements.txt
python server.py --gpu --port 5050
```

4. Use the pod's public URL in VoiceBridge

### Hugging Face Spaces

You can also use Hugging Face's free inference API:

```env
HUGGINGFACE_API_KEY=your_hf_token
```

This uses AI4Bharat's hosted models on Hugging Face.

## Troubleshooting

### CUDA Out of Memory
- Use CPU mode: `python server.py` (without --gpu)
- Or use smaller Whisper model by editing `server.py`

### Slow First Request
- Models are loaded on first use
- Subsequent requests are faster

### Audio Quality Issues
- Ensure input is 16kHz mono WAV for STT
- Use 8kHz output for telephony

## Credits

- [AI4Bharat](https://ai4bharat.org/) - For open-source Indian language AI
- [OpenAI Whisper](https://github.com/openai/whisper) - Base STT model
- [Coqui TTS](https://github.com/coqui-ai/TTS) - TTS framework
