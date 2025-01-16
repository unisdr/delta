# Makefile

# Setting phony targets for Make commands
.PHONY: build start stop down clean logs db-shell

# Build the Docker images
build:
	docker-compose build

# Start all services in the background
start:
	docker-compose up -d

# Stop all running containers
stop:
	docker-compose stop

# Take down all containers and remove volumes
down:
	docker-compose down -v

# Clean up any stopped containers and networks
clean:
	docker system prune -af --volumes

# View logs for services
logs:
	docker-compose logs -f

# Open a shell inside the database container
db-shell:
	docker exec -it $(shell docker-compose ps -q db) bash

# Run database migrations
migrate:
	docker-compose exec app yarn run drizzle-kit push

# Rollback database migrations
rollback:
	docker-compose exec app yarn run drizzle-kit rollback
