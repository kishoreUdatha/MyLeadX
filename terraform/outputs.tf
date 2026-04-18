# MyLeadX - Terraform Outputs

output "ec2_public_ip" {
  description = "Public IP address of the EC2 instance"
  value       = aws_eip.app.public_ip
}

output "ec2_instance_id" {
  description = "EC2 instance ID"
  value       = aws_instance.app.id
}

output "ssh_command" {
  description = "SSH command to connect to the server"
  value       = "ssh -i myleadx-key.pem ec2-user@${aws_eip.app.public_ip}"
}

output "frontend_url" {
  description = "Frontend URL"
  value       = "https://app.myleadx.ai"
}

output "api_url" {
  description = "API URL"
  value       = "https://api.myleadx.ai/api"
}

output "github_secrets" {
  description = "Values to add as GitHub Secrets"
  value = {
    EC2_HOST     = aws_eip.app.public_ip
    EC2_USERNAME = "ec2-user"
    VITE_API_URL = "https://api.myleadx.ai/api"
  }
}

output "dns_records" {
  description = "DNS records to configure for myleadx.ai"
  value       = <<-EOT

    ========================================
    Configure these DNS records for myleadx.ai:
    ========================================
    A     app.myleadx.ai    → ${aws_eip.app.public_ip}
    A     api.myleadx.ai    → ${aws_eip.app.public_ip}
    A     *.myleadx.ai      → ${aws_eip.app.public_ip}
    ========================================
  EOT
}

output "env_production_values" {
  description = "Values for .env.production file"
  value       = <<-EOT

    ========================================
    Update .env.production with these values:
    ========================================
    FRONTEND_URL=https://app.myleadx.ai
    BASE_URL=https://api.myleadx.ai
    VITE_API_URL=https://api.myleadx.ai/api
    CORS_ORIGINS=https://app.myleadx.ai,https://*.myleadx.ai
    AWS_RECORDINGS_BUCKET=${aws_s3_bucket.recordings.id}
    AWS_REGION=ap-south-1
    ========================================
  EOT
}

output "s3_recordings_bucket" {
  description = "S3 bucket name for recordings"
  value       = aws_s3_bucket.recordings.id
}

output "s3_recordings_url" {
  description = "S3 bucket URL for recordings"
  value       = "https://${aws_s3_bucket.recordings.bucket_regional_domain_name}"
}
