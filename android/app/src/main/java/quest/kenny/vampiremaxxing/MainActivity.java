package quest.kenny.vampiremaxxing;

import android.os.Bundle;
import android.view.WindowManager;

import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
  @Override
  public void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);

    // Allow audio to autoplay without a prior user gesture — the game
    // soundtrack starts on boot for better atmosphere.
    this.bridge.getWebView().getSettings().setMediaPlaybackRequiresUserGesture(false);

    // Edge-to-edge: content draws under status + navigation bars.
    WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
    // Draw under any display cutout (notch / punch-hole).
    getWindow().getAttributes().layoutInDisplayCutoutMode =
        WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;

    WindowInsetsControllerCompat controller =
        new WindowInsetsControllerCompat(getWindow(), getWindow().getDecorView());
    // Hide both system bars. Swipe from an edge reveals them briefly.
    controller.hide(WindowInsetsCompat.Type.systemBars());
    controller.setSystemBarsBehavior(
        WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
  }

  @Override
  public void onWindowFocusChanged(boolean hasFocus) {
    super.onWindowFocusChanged(hasFocus);
    // Re-hide system bars when the user swipes them in and focus returns.
    if (hasFocus) {
      WindowInsetsControllerCompat controller =
          new WindowInsetsControllerCompat(getWindow(), getWindow().getDecorView());
      controller.hide(WindowInsetsCompat.Type.systemBars());
      controller.setSystemBarsBehavior(
          WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
    }
  }
}
