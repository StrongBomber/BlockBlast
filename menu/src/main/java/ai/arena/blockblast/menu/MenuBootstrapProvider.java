package ai.arena.blockblast.menu;

import android.app.Activity;
import android.app.Application;
import android.content.ContentProvider;
import android.content.ContentValues;
import android.database.Cursor;
import android.net.Uri;
import android.os.Bundle;
import android.util.Log;

/** Experimental lifecycle entry point for an injected, in-activity menu.
 * This class does not install a score hook or modify scores. */
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
            @Override public void onActivityResumed(Activity activity) {
                if (!activity.getClass().getName().startsWith(GAME_ACTIVITY)) return;
                activity.getWindow().getDecorView().postDelayed(() -> {
                    if (activity.isFinishing() || activity.isDestroyed()) return;
                    try {
                        FloatingMenu.attach(activity);
                        Log.i(TAG, "Menu attached; score hook is not installed");
                    } catch (RuntimeException e) {
                        Log.e(TAG, "Could not attach menu", e);
                    }
                }, 1500);
            }
            @Override public void onActivityCreated(Activity a, Bundle state) {}
            @Override public void onActivityStarted(Activity a) {}
            @Override public void onActivityPaused(Activity a) {}
            @Override public void onActivityStopped(Activity a) {}
            @Override public void onActivitySaveInstanceState(Activity a, Bundle out) {}
            @Override public void onActivityDestroyed(Activity a) {}
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
