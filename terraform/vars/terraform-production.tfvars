environment               = "production"
log_level                 = "info"
desired_count             = 2
auto_scaling_min_capacity = 2
auto_scaling_max_capacity = 15

NODE_ENV                  = "production"
CT_URL                    = "https://api.resourcewatch.org"
healthcheck_path          = "/v1/fw_contextual_layers/healthcheck"
healthcheck_sns_emails    = ["server@3sidedcube.com"]