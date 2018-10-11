# Instructions for deploying Finch and Hummingbird Chrome Apps.
1. Make sure the version number in the `manifest.json` is greater than the one currently deployed.
2. Delete the `"key"` field from the `manifest.json`.
	* This exists to keep the app ID the same between the uploaded app and the source directory, but cannot be present in the uploaded `zip` file.
	* The app ID always stays the same between Chrome app versions on the store so there is no need for it during the upload.
3. `zip` up the app's source directory. Most file managers let you do this with a right click, or from the Linux command line, `zip -r <App Name>.zip <App Name>/` from the current directory.
4. Upload the created `zip` files to the Chrome Web Store.
5. Replace the `"key"` field back in the `manifest.json` so that the local app ID remains consistent.
