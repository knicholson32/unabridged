.PHONY: all test clean dev dev-build dev-up dev-down dev-logs dev-shell check preview local create-local create-all

# create:
# 	docker build --file ./docker/Dockerfile --build-arg GIT_COMMIT=$(shell git rev-parse HEAD) --target prod -t keenanrnicholson/unabridged:latest .
#	docker push keenanrnicholson/unabridged
create-local:
	docker build --file ./docker/Dockerfile --build-arg GIT_COMMIT=$(shell git rev-parse HEAD) --target prod -t keenanrnicholson/unabridged:local .
create-all:
	docker buildx build --builder mybuilder --file ./docker/Dockerfile --push --build-arg GIT_COMMIT=$(shell git rev-parse HEAD) --target prod --platform linux/arm64,linux/amd64 --tag keenanrnicholson/unabridged:latest .
dev:
	docker build --build-arg GIT_COMMIT=$(shell git rev-parse HEAD) --file ./docker/Dockerfile --target dev -t unabridged-dev .
	docker compose -f ./docker/docker-compose.dev.yml -p unabridged up --remove-orphans

# Run the dev environment (Unabridged + Audiobookshelf) in the background
dev-build:
	docker build --build-arg GIT_COMMIT=$(shell git rev-parse HEAD) --file ./docker/Dockerfile --target dev -t unabridged-dev .
dev-up:
	docker compose -f ./docker/docker-compose.dev.yml -p unabridged up -d --remove-orphans
dev-down:
	docker compose -f ./docker/docker-compose.dev.yml -p unabridged down
dev-logs:
	docker compose -f ./docker/docker-compose.dev.yml -p unabridged logs -f --tail=100
dev-shell:
	docker exec -it unabridged-dev sh
# Type-check inside the dev container (node_modules is built for Linux)
check:
	docker exec unabridged-dev sh -c "pnpm exec svelte-kit sync && pnpm exec svelte-check --tsconfig ./jsconfig.json"
# Unit tests inside the dev container. ABS_TEST_URL, ABS_TEST_KEY and ABS_TEST_LIBRARY, if set, also
# run the tests against a real Audiobookshelf server.
test:
	docker exec -e ABS_TEST_URL -e ABS_TEST_KEY -e ABS_TEST_LIBRARY unabridged-dev pnpm exec vitest run
preview:
	rm -rf ./node_modules
	docker build --build-arg GIT_COMMIT=$(shell git rev-parse HEAD) --file ./docker/Dockerfile --target dev -t unabridged-dev .
	docker compose -f ./docker/docker-compose.preview.yml -p unabridged up --remove-orphans
local:
	docker compose -f ./docker/docker-compose.local.yml up --remove-orphans