environment               = "staging"
log_level                 = "info"
desired_count             = 1
auto_scaling_min_capacity = 1
auto_scaling_max_capacity = 15

NODE_ENV                  = "staging"
CT_URL                    = "https://staging-api.resourcewatch.org"
healthcheck_path          = "/v1/fw_contextual_layers/healthcheck"
healthcheck_sns_emails    = ["server@3sidedcube.com"]