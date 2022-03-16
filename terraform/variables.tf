variable "project_prefix" {
  type    = string
  default = "fw-contextual-layers"
}

variable "environment" {
  type        = string
  description = "An environment namespace for the infrastructure."
}

variable "region" {
  default = "us-east-1"
  type    = string
}

variable "container_port" {
  default = 80
  type    = number
}
variable "log_level" {
  type = string
}
variable "log_retention" {
  type    = number
  default = 30
}
variable "desired_count" {
  type = number
}
variable "fargate_cpu" {
  type    = number
  default = 256
}
variable "fargate_memory" {
  type    = number
  default = 512
}
variable "auto_scaling_cooldown" {
  type    = number
  default = 300
}
variable "auto_scaling_max_capacity" {
  type = number
}
variable "auto_scaling_max_cpu_util" {
  type    = number
  default = 75
}
variable "auto_scaling_min_capacity" {
  type = number
}

variable "git_sha" {
  type = string
}
variable "NODE_PATH" {
  type    = string
  default = "app/src"
}
variable "NODE_ENV" {
  type    = string
  default = "dev"
}
variable "CT_URL" {
  type    = string
  default = "https://api.resourcewatch.org"
}
variable "API_VERSION" {
  type    = string
  default = "v1"
}
variable "healthcheck_path" {
  type = string
}

variable "healthcheck_sns_emails" {
  type = list(string)
}