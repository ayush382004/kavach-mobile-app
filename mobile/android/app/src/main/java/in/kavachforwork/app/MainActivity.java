package in.kavachforwork.app;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;
import com.kavach.KavachPlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(KavachPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
