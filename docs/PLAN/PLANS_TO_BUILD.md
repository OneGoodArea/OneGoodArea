# Plans that we think we need to build

## Containers
* ~~Optimize Container Content. Web Container has Only WEB, API has ONLY APIS~~ → **Plan 017** (`plan/017_container_minimization.md`)

## CICD
* build containers in github

## Containers
* ~~We want to have a container only with the needed code. Today the api is shipping both the web and api, we should separate them~~
* ~~We want to locally build the WEB APP in a Container and test it, add to make with a compose up all the enfironment including DB~~

## Observability
* should activity events be on postgres or should them be in some sort of observability log?
* what about performance observability?
* what about business metrics

## API Secrects/Key
* audit for security, consider the table definitions and content
* same applies to site login and email verification during registration

## Site
* QR Code & Analytics for it

## QA tooling / scripts
* ~~AR-464: reset playground rate-limit + bootstrap test key Make targets~~ → **Plan 040** (`docs/PLANS/040_DONE_reset_playground_rate_limit_ar464.md`)
* Retire old e2e + bootstrap fallback → **Plan 042** (`docs/PLANS/042_qa_scripts_housekeeping_ar478.md`)