package expo.modules.veldrynplaygames

import android.app.Application
import android.content.Context
import com.google.android.gms.games.PlayGamesSdk
import expo.modules.core.interfaces.ApplicationLifecycleListener
import expo.modules.core.interfaces.Package

class VeldrynPlayGamesPackage : Package {
  override fun createApplicationLifecycleListeners(context: Context): List<ApplicationLifecycleListener> {
    return listOf(VeldrynPlayGamesApplicationLifecycleListener())
  }
}

private class VeldrynPlayGamesApplicationLifecycleListener : ApplicationLifecycleListener {
  override fun onCreate(application: Application) {
    val projectIdResource = application.resources.getIdentifier(
      "game_services_project_id",
      "string",
      application.packageName
    )
    if (projectIdResource == 0) return
    val projectId = application.getString(projectIdResource).trim()
    if (projectId.isEmpty()) return
    PlayGamesSdk.initialize(application)
  }
}
