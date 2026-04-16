# VoiceBridge - Terraform Variables

variable "aws_region" {
  description = "AWS region to deploy resources"
  type        = string
  default     = "ap-south-1" # Mumbai - closest to India
}

variable "project_name" {
  description = "Project name for resource naming"
  type        = string
  default     = "voicebridge"
}

variable "instance_type" {
  description = "EC2 instance type"
  type        = string
  default     = "t3.medium" # 2 vCPU, 4GB RAM (~$30/month)
}

variable "ssh_public_key" {
  description = "SSH public key for EC2 access"
  type        = string
}

variable "github_repo" {
  description = "GitHub repository URL"
  type        = string
  default     = "https://github.com/kishoreUdatha/VoiceBridge.git"
}
