.PHONY: all test clean

# create-pi:
# 	docker -H tcp://192.168.1.100:2375 build --push --file ./Dockerfile.base -t keenanrnicholson/audible-plex-base .
create:
	docker build --file ./docker/Dockerfile --target prod -t keenanrnicholson/unabridged:latest .
	docker build --file ./docker/Dockerfile --target prod-mongo -t keenanrnicholson/unabridged:latest-mongo .
	# docker push keenanrnicholson/unabridged
create-all:
    # buildx create --name mybuilder && --platform linux/arm64,linux/amd64
	docker buildx build --builder mybuilder --file ./docker/Dockerfile --push --target prod --platform linux/arm64,linux/amd64 --tag keenanrnicholson/unabridged:latest .
	docker buildx build --builder mybuilder --file ./docker/Dockerfile --push --target prod-mongo --platform linux/arm64,linux/amd64 --tag keenanrnicholson/unabridged:latest-mongo .
setup:
	docker volume rm --force nodemodules-unabridged
	docker volume create nodemodules-unabridged
	docker build --file ./docker/Dockerfile --target dev -t unabridged-dev .
install:
	docker-compose -f ./docker/docker-compose.builder.yml -p unabridged run --rm install
dev:
	docker-compose -f ./docker/docker-compose.yml -p unabridged up --remove-orphans
# test:
# 	docker-compose -f ./docker/docker-compose.tester.yml run --rm test
# test-single:
# 	docker-compose -f ./docker/docker-compose.tester.yml run --rm test-single