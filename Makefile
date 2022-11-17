.PHONY: all test clean

# create-pi:
# 	docker -H tcp://192.168.1.100:2375 build --push --file ./Dockerfile.base -t keenanrnicholson/audible-plex-base .
create:
	docker build --file ./docker/Dockerfile -t keenanrnicholson/audible-plex-base .
	docker push keenanrnicholson/audible-plex-base
create-all:
    # buildx create --name mybuilder && --platform linux/arm64,linux/amd64
	docker buildx build --builder mybuilder --file ./docker/Dockerfile --push --platform linux/arm64,linux/amd64 --tag keenanrnicholson/audible-plex-base:latest .
setup:
	docker volume rm --force nodemodules-unabridged
	docker volume create nodemodules-unabridged
	docker build --file ./docker/Dockerfile.dev -t unabridged-dev .
install:
	docker-compose -f ./docker/docker-compose.builder.yml -p unabridged run --rm install
dev:
	docker-compose -f ./docker/docker-compose.dev.yml -p unabridged up --remove-orphans
# test:
# 	docker-compose -f ./docker/docker-compose.tester.yml run --rm test
# test-single:
# 	docker-compose -f ./docker/docker-compose.tester.yml run --rm test-single