# Plans that we think we need to build

## Containers
* ~~Optimize Container Content. Web Container has Only WEB, API has ONLY APIS~~ → **Plan 017** (`plan/017_container_minimization.md`)

## CICD
* build containers in github
* deploy containers to oracle cloud
* integrate render check to github
* integrate OCI deploy check in GITHUB

## Containers
* We want to have a container only with the needed code. Today the api is shipping both the web and api, we should separate them
* We want to locally build the WEB APP in a Container and test it, add to make with a compose up all the enfironment including DB
* Same for Oracle Cloud

## Observability
* should activity events be on postgres or should them be in some sort of observability log?
* what about performance observability?
* what about business metrics

## API Secrects/Key
* audit for security, consider the table definitions and content
* same applies to site login and email verification during registration

## Site
* QR Code & Analytics for it