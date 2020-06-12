start-prod:
	cd data-cleaning; NODE_ENV=production PORT=3000 npm start

build-and-start-prod: build-prod start-prod

build-prod: build-ui
	cd ./data-cleaning; npm install
	cp -r ./frontend/build ./data-cleaning/client

build-ui:
	cd ./frontend; npm run build

clean-db:
	docker-compose -f data-cleaning/docker-compose.yml down -v
	docker-compose -f data-cleaning/docker-compose.yml up -d
	cd data-cleaning; npm run migrate up; node bin/etl.js

etl:
	cd ./data-cleaning; node bin/etl.js