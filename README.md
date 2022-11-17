# Unabridged


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