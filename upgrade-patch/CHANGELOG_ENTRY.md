## CHANGELOG

### Fixed
- Upgrade `firebase-admin` to 13.5.0 to remediate critical protobufjs/google-gax vulnerability chain.
- Fix `/discover` runtime error by ensuring `collection()` receives a concrete Firestore instance (added `getDb()` getter).
