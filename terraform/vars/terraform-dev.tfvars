environment               = "dev"
logger_level                 = "debug"
desired_count             = 1
auto_scaling_min_capacity = 1
auto_scaling_max_capacity = 5

NODE_ENV                  = "dev"
CT_URL                    = "https://staging-api.resourcewatch.org"
healthcheck_path          = "/v1/fw_contextual_layers/healthcheck"
healthcheck_sns_emails    = ["server@3sidedcube.com"]