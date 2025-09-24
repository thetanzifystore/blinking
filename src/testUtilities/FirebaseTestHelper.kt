package testUtilities

import com.google.auth.oauth2.GoogleCredentials
import com.google.firebase.FirebaseApp
import com.google.firebase.FirebaseOptions
import com.google.firebase.cloud.FirestoreClient
import com.google.cloud.firestore.Firestore
import java.io.File
import java.io.FileInputStream

object FirebaseTestHelper {
    private const val EMULATOR_PROJECT = "demo-project"

    @JvmStatic
    fun initIfNeeded(): Firestore {
        // If already initialized, return the Firestore instance.
        if (FirebaseApp.getApps().isNotEmpty()) {
            return FirestoreClient.getFirestore()
        }

        val saPath = System.getenv("FIREBASE_SERVICE_ACCOUNT_PATH")
        if (!saPath.isNullOrBlank() && File(saPath).exists()) {
            FileInputStream(saPath).use { serviceAccount ->
                val options = FirebaseOptions.builder()
                    .setCredentials(GoogleCredentials.fromStream(serviceAccount))
                    .setProjectId(EMULATOR_PROJECT)
                    .build()
                FirebaseApp.initializeApp(options)
            }
            return FirestoreClient.getFirestore()
        }

        // Fallback to emulator mode. Configure environment variables expected by the SDK.
        // For Firestore emulator, set FIRESTORE_EMULATOR_HOST to 127.0.0.1:8080 in the test environment.
        // The projectId is set to EMULATOR_PROJECT.
        val options = FirebaseOptions.builder()
            .setProjectId(EMULATOR_PROJECT)
            .build()
        FirebaseApp.initializeApp(options)

        System.getenv("FIRESTORE_EMULATOR_HOST")?.let {
            // no-op: environment already set by CI or local script
        }

        return FirestoreClient.getFirestore()
    }

    @JvmStatic
    fun getDb(): Firestore = initIfNeeded()
}
