![Unabridged Logo](../assets/Unabridged.png?raw=true)
--
### Development
Development for Unabridged is done inside a developmental Docker image. Create this image with the following command:
```
make setup
```
Any time `node_modules` are altered in `UI`, or if sitting down for a new development session, run the following command:
```
make install
```
To actually start the development Docker image and run `npm run dev`, run the following command:
```
make dev
```

Run the following from inside the docker container
```
audible quick-start
```

## TODO
- [X] Remove beets-audible items from this project and set Docker to make the required changes / installation as apart of the build process
- [ ] Consider moving to stand-alone `audible-cli` install so Python is not required at all. What would the speed implications be?
- [ ] Compile all dependencies for `audible-cli` in the build stage and export the compiled wheels to the prod and dev stages