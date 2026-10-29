package org.cocos2dx.javascript;

import android.app.Activity;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.os.Bundle;
import android.os.SystemClock;
import android.util.Log;
import android.view.Gravity;
import android.view.InputDevice;
import android.view.MotionEvent;
import android.widget.TextView;

/** Disposable stand-in used to exercise the lifecycle bootstrap, not the game. */
public final class AppActivity extends Activity {
    private int taps;
    private final BroadcastReceiver gestures = new BroadcastReceiver() {
        @Override public void onReceive(Context context, Intent intent) {
            int count = intent.getIntExtra("count", 3);
            if (count < 1 || count > 3) return;
            long down = SystemClock.uptimeMillis();
            dispatch(down, MotionEvent.ACTION_DOWN, 1);
            for (int i = 1; i < count; i++) dispatch(down, MotionEvent.ACTION_POINTER_DOWN | (i << MotionEvent.ACTION_POINTER_INDEX_SHIFT), i + 1);
            dispatch(down, MotionEvent.ACTION_MOVE, count);
            // Lifting and replacing the third finger in one gesture must not toggle twice.
            if (count == 3 && intent.getBooleanExtra("retouch", false)) {
                dispatch(down, MotionEvent.ACTION_POINTER_UP | (2 << MotionEvent.ACTION_POINTER_INDEX_SHIFT), 3);
                dispatch(down, MotionEvent.ACTION_POINTER_DOWN | (2 << MotionEvent.ACTION_POINTER_INDEX_SHIFT), 3);
            }
            for (int i = count - 1; i > 0; i--) dispatch(down, MotionEvent.ACTION_POINTER_UP | (i << MotionEvent.ACTION_POINTER_INDEX_SHIFT), i + 1);
            dispatch(down, MotionEvent.ACTION_UP, 1);
        }
    };

    private void dispatch(long down, int action, int count) {
        MotionEvent.PointerProperties[] properties = new MotionEvent.PointerProperties[count];
        MotionEvent.PointerCoords[] coordinates = new MotionEvent.PointerCoords[count];
        for (int i = 0; i < count; i++) {
            properties[i] = new MotionEvent.PointerProperties();
            properties[i].id = i;
            properties[i].toolType = MotionEvent.TOOL_TYPE_FINGER;
            coordinates[i] = new MotionEvent.PointerCoords();
            coordinates[i].x = getWindow().getDecorView().getWidth() * 0.75f + i * 15;
            coordinates[i].y = getWindow().getDecorView().getHeight() * 0.7f;
            coordinates[i].pressure = 1;
            coordinates[i].size = 1;
        }
        MotionEvent event = MotionEvent.obtain(down, SystemClock.uptimeMillis(), action, count,
                properties, coordinates, 0, 0, 1, 1, 0, 0, InputDevice.SOURCE_TOUCHSCREEN, 0);
        getWindow().getCallback().dispatchTouchEvent(event);
        event.recycle();
    }

    @Override protected void onCreate(Bundle state) {
        super.onCreate(state);
        TextView game = new TextView(this);
        game.setGravity(Gravity.CENTER);
        game.setTextSize(24);
        game.setText("Oyun alanı: 0");
        game.setOnClickListener(v -> game.setText("Oyun alanı: " + ++taps));
        game.setOnTouchListener((v, event) -> {
            Log.i("ArenaTestInput", "pointers=" + event.getPointerCount() + ",action=" + event.getActionMasked());
            return false;
        });
        setContentView(game);
        registerReceiver(gestures, new IntentFilter("ai.arena.blockblast.testapp.FINGERS"));
    }

    @Override protected void onDestroy() {
        unregisterReceiver(gestures);
        super.onDestroy();
    }
}
