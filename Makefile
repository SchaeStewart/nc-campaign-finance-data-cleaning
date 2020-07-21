PORT ?= 3000
NODE_ENV ?= production

start-prod:
	cd data-cleaning; NODE_ENV=${NODE_ENV} PORT=${PORT} npm start

build-and-start-prod: build-prod start-prod

build-prod: build-prod-ui
	rm -rf ./data-cleaning/client; cp -r ./frontend/build/ ./data-cleaning/client; cd ./data-cleaning; npm install
	cd ./data-cleaning; npm install
	cd ./data-cleaning; npm run migrate up 

build-ui:
	cd ./frontend; npm run build

build-prod-ui:
	cd ./frontend; npm install ; NODE_ENV=${NODE_ENV} npm run build

clean-db:
	docker-compose -f data-cleaning/docker-compose.yml down -v
	docker-compose -f data-cleaning/docker-compose.yml up -d
	cd data-cleaning; npm run migrate up; node bin/etl.js

empty-db:
	docker-compose -f data-cleaning/docker-compose.yml down -v
	docker-compose -f data-cleaning/docker-compose.yml up -d
	cd data-cleaning; npm run migrate up


etl:
	cd ./data-cleaning; node bin/etl.js
