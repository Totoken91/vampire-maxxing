package quest.kenny.vampiremaxxing;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
  @Override
  public void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    // Allow audio to autoplay without a prior user gesture — the game
    // soundtrack starts on boot for better atmosphere.
    this.bridge.getWebView().getSettings().setMediaPlaybackRequiresUserGesture(false);
  }
}
