package ai.arena.blockblast.menu;

import android.app.Activity;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.lang.reflect.Method;
import java.nio.charset.StandardCharsets;
import java.util.IdentityHashMap;
import java.util.Map;

/** Schedules the version-specific Cocos hook on the game's GL thread. */
final class ScoreHookBridge {
    private static final String TAG = "ArenaScoreBridge";
    private static final Handler MAIN = new Handler(Looper.getMainLooper());
    private static final Map<Activity, Runnable> POLLERS = new IdentityHashMap<>();
    private static String script;

    private ScoreHookBridge() {}

    static void start(Activity activity) {
        stop(activity);
        try {
            if (script == null) {
                try (InputStream in = activity.getAssets().open("arena_score_hook.js");
                     ByteArrayOutputStream bytes = new ByteArrayOutputStream()) {
                    byte[] buffer = new byte[4096];
                    int count;
                    while ((count = in.read(buffer)) != -1) bytes.write(buffer, 0, count);
                    script = new String(bytes.toByteArray(), StandardCharsets.UTF_8);
                }
            }
        } catch (Exception e) {
            Log.e(TAG, "Score hook asset unavailable", e);
            return;
        }
        final Runnable poll = new Runnable() {
            @Override public void run() {
                if (POLLERS.get(activity) != this || activity.isFinishing() || activity.isDestroyed()) return;
                try {
                    ClassLoader loader = activity.getClass().getClassLoader();
                    Class<?> helper = Class.forName("org.cocos2dx.lib.Cocos2dxHelper", true, loader);
                    Class<?> bridge = Class.forName("org.cocos2dx.lib.Cocos2dxJavascriptJavaBridge", true, loader);
                    Method schedule = helper.getMethod("runOnGLThread", Runnable.class);
                    Method evaluate = bridge.getMethod("evalString", String.class);
                    schedule.invoke(null, (Runnable) () -> {
                        try { evaluate.invoke(null, script); }
                        catch (Exception e) { Log.w(TAG, "Could not evaluate score hook", e); }
                    });
                } catch (Exception ignored) {
                    // Cocos and its dynamic class loader may not be ready yet.
                }
                MAIN.postDelayed(this, 1500);
            }
        };
        POLLERS.put(activity, poll);
        MAIN.post(poll);
    }

    static void stop(Activity activity) {
        Runnable poll = POLLERS.remove(activity);
        if (poll != null) MAIN.removeCallbacks(poll);
    }
}
