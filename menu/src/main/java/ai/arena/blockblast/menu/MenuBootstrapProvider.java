package ai.arena.blockblast.menu;

import android.app.Activity;
import android.app.Application;
import android.content.ContentProvider;
import android.content.ContentValues;
import android.database.Cursor;
import android.net.Uri;
import android.os.Bundle;
import android.util.Log;
import java.util.Collections;
import java.util.IdentityHashMap;
import java.util.Set;

/** Experimental lifecycle entry point for an injected, in-activity menu.
 * The score hook is loaded separately on the game's GL thread. */
public final class MenuBootstrapProvider extends ContentProvider {
    private static final String TAG = "ArenaMenuBootstrap";
    private static final String GAME_ACTIVITY = "org.cocos2dx.javascript.AppActivity";

    @Override public boolean onCreate() {
        if (getContext() == null || !(getContext().getApplicationContext() instanceof Application)) {
            Log.e(TAG, "Application unavailable; menu not attached");
            return false;
        }
        Application application = (Application) getContext().getApplicationContext();
        application.registerActivityLifecycleCallbacks(new Application.ActivityLifecycleCallbacks() {
            private final Set<Activity> resumed = Collections.newSetFromMap(new IdentityHashMap<Activity, Boolean>());
            @Override public void onActivityResumed(Activity activity) {
                if (!activity.getClass().getName().startsWith(GAME_ACTIVITY)) return;
                resumed.add(activity);
                activity.getWindow().getDecorView().postDelayed(() -> {
                    if (!resumed.contains(activity) || activity.isFinishing() || activity.isDestroyed()) return;
                    try {
                        FloatingMenu.attach(activity);
                        ScoreHookBridge.start(activity);
                        Log.i(TAG, "Menu attached; score bridge started");
                    } catch (RuntimeException e) {
                        Log.e(TAG, "Could not attach menu", e);
                    }
                }, 1500);
            }
            @Override public void onActivityCreated(Activity a, Bundle state) {}
            @Override public void onActivityStarted(Activity a) {}
            @Override public void onActivityPaused(Activity a) { resumed.remove(a); ScoreHookBridge.stop(a); }
            @Override public void onActivityStopped(Activity a) {}
            @Override public void onActivitySaveInstanceState(Activity a, Bundle out) {}
            @Override public void onActivityDestroyed(Activity a) { resumed.remove(a); ScoreHookBridge.stop(a); }
        });
        return true;
    }

    @Override public Cursor query(Uri uri, String[] projection, String selection,
                                  String[] selectionArgs, String sortOrder) { return null; }
    @Override public String getType(Uri uri) { return null; }
    @Override public Uri insert(Uri uri, ContentValues values) { return null; }
    @Override public int delete(Uri uri, String selection, String[] selectionArgs) { return 0; }
    @Override public int update(Uri uri, ContentValues values, String selection,
                                String[] selectionArgs) { return 0; }
}
