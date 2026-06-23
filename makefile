COMPOSE ?= docker compose -f Docker-compose.yml

.PHONY: help dev infra down nuke db redis logs wait-db bootstrap migrate dev-migrate seed fresh fresh-seed test test-watch bench

help:
	@echo "Developer targets:"
	@echo "  make dev         Build and run the API, Postgres, and Redis with compose watch"
	@echo "  make infra       Run only Postgres and Redis for local Bun development"
	@echo "  make down        Stop compose services"
	@echo "  make nuke        Stop compose services and remove volumes"
	@echo "  make db          Open psql in the db container"
	@echo "  make redis       Open redis-cli in the Redis container"
	@echo "  make logs        Follow API container logs"
	@echo "  make fresh       Recreate local infra, bootstrap DB, and apply dev migrations"
	@echo "  make test        Run the Bun test suite"

dev:
	$(COMPOSE) up --build --watch

infra:
	$(COMPOSE) up db redis -d

down:
	$(COMPOSE) down

nuke:
	$(COMPOSE) down -v

db:
	$(COMPOSE) exec db sh -c 'psql -U "$$POSTGRES_USER" -d "$$POSTGRES_DB"'

redis:
	$(COMPOSE) exec redis redis-cli

logs:
	$(COMPOSE) logs -f api

wait-db:
	@echo "Waiting for db..."
	@until $(COMPOSE) exec db sh -c 'pg_isready -U "$$POSTGRES_USER" -d "$$POSTGRES_DB"' >/dev/null 2>&1; do sleep 1; done

bootstrap:
	bun run db:setup

migrate:
	bun run db:migrate

dev-migrate:
	bun run db:dev-migrate

seed:
	bun run db:seed

fresh:
	$(MAKE) nuke
	$(MAKE) infra
	$(MAKE) wait-db
	$(MAKE) bootstrap
	$(MAKE) dev-migrate

fresh-seed: fresh
	$(MAKE) seed

test:
	bun run test

test-watch:
	bun run test:watch

bench:
	bun run bench:search
