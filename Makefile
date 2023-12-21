.PHONY: all test clean

# create:
# 	docker build --file ./docker/Dockerfile --build-arg GIT_COMMIT=$(shell git rev-parse HEAD) --target prod -t keenanrnicholson/unabridged:latest .
#	docker push keenanrnicholson/unabridged
create-local:
	docker build --file ./docker/Dockerfile --build-arg GIT_COMMIT=$(shell git rev-parse HEAD) --target prod -t keenanrnicholson/unabridged:latest .
create-all:
	docker buildx build --builder mybuilder --file ./docker/Dockerfile --push --build-arg GIT_COMMIT=$(shell git rev-parse HEAD) --target prod --platform linux/arm64,linux/amd64 --tag keenanrnicholson/unabridged:latest .
dev:
	docker build --build-arg GIT_COMMIT=$(shell git rev-parse HEAD) --file ./docker/Dockerfile --target dev -t unabridged-dev .
	docker-compose -f ./docker/docker-compose.dev.yml -p unabridged up --remove-orphans
preview:
	rm -rf ./node_modules
	docker build --build-arg GIT_COMMIT=$(shell git rev-parse HEAD) --file ./docker/Dockerfile --target dev -t unabridged-dev .
	docker-compose -f ./docker/docker-compose.preview.yml -p unabridged up --remove-orphans
local:
	docker-compose -f ./docker/docker-compose.local.yml up --remove-orphans