package expo.modules.veldrynplaygames

import android.app.Activity
import com.google.android.gms.games.PlayGames
import com.google.android.gms.tasks.Task
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.functions.Coroutine
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException

private class PlayGamesException(message: String, cause: Throwable? = null) :
  CodedException(message, cause)

class VeldrynPlayGamesModule : Module() {
  private fun currentActivity(): Activity =
    appContext.currentActivity ?: throw PlayGamesException("Google Play Games requires an active Android screen.")

  private suspend fun <T> Task<T>.awaitValue(errorMessage: String): T =
    suspendCancellableCoroutine { continuation ->
      addOnCompleteListener { task ->
        if (!continuation.isActive) return@addOnCompleteListener
        if (task.isSuccessful) {
          continuation.resume(task.result)
        } else {
          continuation.resumeWithException(PlayGamesException(errorMessage, task.exception))
        }
      }
    }

  private suspend fun playGamesResult(signIn: Boolean): Map<String, Any?> {
    val activity = currentActivity()
    val signInClient = PlayGames.getGamesSignInClient(activity)
    val authentication = if (signIn) {
      signInClient.signIn().awaitValue("Google Play Games sign-in failed. Please try again.")
    } else {
      signInClient.isAuthenticated().awaitValue("Could not check Google Play Games sign-in.")
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
    Name("VeldrynPlayGames")

    AsyncFunction("getStatus") Coroutine {
      playGamesResult(signIn = false)
    }

    AsyncFunction("signIn") Coroutine {
      playGamesResult(signIn = true)
    }
  }
}
