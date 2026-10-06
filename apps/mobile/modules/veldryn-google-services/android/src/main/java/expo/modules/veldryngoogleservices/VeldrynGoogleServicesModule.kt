package expo.modules.veldryngoogleservices

import android.app.Activity
import android.util.Base64
import androidx.credentials.CredentialManager
import androidx.credentials.CustomCredential
import androidx.credentials.GetCredentialRequest
import androidx.credentials.exceptions.GetCredentialCancellationException
import com.google.android.gms.games.PlayGames
import com.google.android.gms.tasks.Task
import com.google.android.libraries.identity.googleid.GetSignInWithGoogleOption
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.functions.Coroutine
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.withContext
import java.security.SecureRandom
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException

private class GoogleServicesException(message: String, cause: Throwable? = null) :
  CodedException(message, cause)

class VeldrynGoogleServicesModule : Module() {
  private val secureRandom = SecureRandom()

  private fun currentActivity(): Activity =
    appContext.currentActivity ?: throw GoogleServicesException("Google sign-in requires an active Android screen.")

  private fun createNonce(): String {
    val bytes = ByteArray(32)
    secureRandom.nextBytes(bytes)
    return Base64.encodeToString(bytes, Base64.URL_SAFE or Base64.NO_WRAP or Base64.NO_PADDING)
  }

  private suspend fun <T> Task<T>.awaitValue(errorMessage: String): T =
    suspendCancellableCoroutine { continuation ->
      addOnCompleteListener { task ->
        if (!continuation.isActive) return@addOnCompleteListener
        if (task.isSuccessful) {
          continuation.resume(task.result)
        } else {
          continuation.resumeWithException(
            GoogleServicesException(errorMessage, task.exception)
          )
        }
      }
    }

  private suspend fun playGamesResult(signIn: Boolean): Map<String, Any?> {
    val activity = currentActivity()
    val client = PlayGames.getGamesSignInClient(activity)
    val authentication = if (signIn) {
      client.signIn().awaitValue("Google Play Games sign-in failed. Please try again.")
    } else {
      client.isAuthenticated().awaitValue("Could not check Google Play Games sign-in.")
    }
    if (!authentication.isAuthenticated) return mapOf("authenticated" to false)
    val player = PlayGames.getPlayersClient(activity)
      .getCurrentPlayer()
      .awaitValue("Google Play Games is signed in, but the player profile could not be loaded.")
    return mapOf(
      "authenticated" to true,
      "playerId" to player.playerId,
      "displayName" to player.displayName
    )
  }

  override fun definition() = ModuleDefinition {
    Name("VeldrynGoogleServices")

    AsyncFunction("signInWithGoogle") Coroutine { serverClientId: String ->
      if (serverClientId.isBlank()) {
        throw GoogleServicesException("Google sign-in is not configured in this build.")
      }
      val activity = currentActivity()
      val nonce = createNonce()
      val option = GetSignInWithGoogleOption.Builder(serverClientId)
        .setNonce(nonce)
        .build()
      val request = GetCredentialRequest.Builder()
        .addCredentialOption(option)
        .build()
      val result = try {
        withContext(Dispatchers.Main) {
          CredentialManager.create(activity).getCredential(activity, request)
        }
      } catch (error: GetCredentialCancellationException) {
        throw GoogleServicesException("Google sign-in was cancelled.", error)
      } catch (error: Exception) {
        throw GoogleServicesException("Google sign-in failed. Please try again.", error)
      }
      val credential = result.credential
      if (credential !is CustomCredential ||
        credential.type != GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL
      ) {
        throw GoogleServicesException("Google did not return a supported sign-in credential.")
      }
      val googleCredential = try {
        GoogleIdTokenCredential.createFrom(credential.data)
      } catch (error: Exception) {
        throw GoogleServicesException("Google returned an invalid sign-in credential.", error)
      }
      mapOf("idToken" to googleCredential.idToken, "nonce" to nonce)
    }

    AsyncFunction("getPlayGamesStatus") Coroutine {
      playGamesResult(signIn = false)
    }

    AsyncFunction("signInPlayGames") Coroutine {
      playGamesResult(signIn = true)
    }
  }
}
