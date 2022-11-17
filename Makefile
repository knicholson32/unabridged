.PHONY: all test clean

create-pi:
	docker -H tcp://192.168.1.100:2375 build --push --file ./Dockerfile.base -t keenanrnicholson/audible-plex-base .
create:
	docker build --file ./Dockerfile.base -t keenanrnicholson/audible-plex-base .
	docker push keenanrnicholson/audible-plex-base
create-all:
    # buildx create --name mybuilder && --platform linux/arm64,linux/amd64
	docker buildx build --builder mybuilder --file ./Dockerfile.base --push --platform linux/arm64,linux/amd64 --tag keenanrnicholson/audible-plex-base:latest .
setup:
	docker volume rm --force nodemodules-audible-plex
	docker volume create nodemodules-audible-plex
install:
	docker-compose -f docker-compose.builder.yml run --rm install
dev:
	docker-compose up
# test:
# 	docker-compose -f docker-compose.tester.yml run --rm test
# test-single:
# 	docker-compose -f docker-compose.tester.yml run --rm test-single