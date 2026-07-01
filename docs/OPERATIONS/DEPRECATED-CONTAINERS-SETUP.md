# Containers setup

You can use containers in development and execution. Docker in windows and mac and podman in linux. POdman is preferred, if not available in linux it will default back to docker.

## Applications

There are a few targets in `make` one can use in order to run the application as a whole and they are:

- `make stack-up-min` starts the minimal profile with build of everything
- `make stack-up-full` starts the full profile and mocks
- `make stack-up-db` starts the db profile, which are postgres and neon proxy
- `make stack-down` shuts the composable down
- `make stack-logs` follow logs for the services
- `make stack-clean` stops all, and clean the volumes (CAREFULL here on the volumes)

- `make api-up` starts the minimal profile building the API container, similar to stack-up
- `make api-logs` Follow the api-logs
- `make web-up` starts the minimal profile building the web container, similar to stack-up
- `make web-logs` Follow the web-logs

- `make db-seed` seeds the postgress DB
- `make api-test-coverage-container` run api test in ephemeral container
- `make web-test-coverage-container` run web test in ephemeral container

The profiles are easily understood looking at - **[`compose.yml`](../../compose/compose.yml)** — Composable Functions

You can start as many profiles as you want yusin compose directely passing multiple profiles parameters