package com.neuralink.voiceassistant;

import android.content.Context;
import android.content.Intent;
import android.provider.Settings;
import android.view.accessibility.AccessibilityManager;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.BridgeActivity;
import android.os.Bundle;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        registerPlugin(AccessibilityPlugin.class);
    }
}

@CapacitorPlugin(name = "AccessibilityPlugin")
class AccessibilityPlugin extends Plugin {
    @PluginMethod
    public void checkAccessibilityStatus(PluginCall call) {
        Context context = getContext();
        AccessibilityManager am = (AccessibilityManager) context.getSystemService(Context.ACCESSIBILITY_SERVICE);
        boolean isEnabled = false;
        
        // This is a simple check. For specific services, more logic is needed.
        if (am != null) {
            isEnabled = am.isEnabled();
        }

        JSObject ret = new JSObject();
        ret.put("enabled", isEnabled);
        call.resolve(ret);
    }

    @PluginMethod
    public void openAccessibilitySettings(PluginCall call) {
        Intent intent = new Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS);
        getContext().startActivity(intent);
        call.resolve();
    }
}
