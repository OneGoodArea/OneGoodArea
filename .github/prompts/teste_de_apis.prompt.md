---
name: teste_de_apis
description: Prompt to Create API Tests
---

I  want to create a full coverage test suite for my api module living in apps/api.

For that I have a file called `docs/API-REFERENCE/ENDPOINTS-BY-PRODUCT.md` where I have a list of all the endpoints grouped by product. I dont know if that file is updated. 

I want you to check against the codebase and check if I am missing something.

Once it is checked, update the file and then create a test suite for all endpoints. That  test suite can be a series of curl commands that I will run at the terminal.

I want the domain  to be a variable, because it could be onegoodarea.co.uk, onegoodarea.com or localhost:8080 depending on the environment and I decide when I run the tests passing it as parameter.