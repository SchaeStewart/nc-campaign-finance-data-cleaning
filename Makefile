start-prod: build-prod
	cd data-cleaning; NODE_ENV=production npm start

build-prod: build-ui
	cp -r ./frontend/build ./data-cleaning/client

build-ui:
	cd ./frontend; npm run build

clean-db:
	docker-compose -f data-cleaning/docker-compose.yml down -v
	docker-compose -f data-cleaning/docker-compose.yml up -d
	cd data-cleaning; npm run migrate up; node bin/etl.js
