package testUtilities

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test
import java.util.UUID

class FirebaseTestHelperTest {

    @Test
    fun `healthcheck writes and reads doc`() {
        val db = FirebaseTestHelper.getDb()
        val id = "test-${UUID.randomUUID()}"
        val docRef = db.collection("healthcheck").document(id)
        val payload = mapOf("ok" to true)

        // Write
        val write = docRef.set(payload).get()

        // Read
        val snap = docRef.get().get()
        val read = snap.get("ok") as Boolean

        assertEquals(true, read)
    }
}
