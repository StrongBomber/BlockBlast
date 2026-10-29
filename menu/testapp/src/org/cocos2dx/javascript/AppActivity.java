package org.cocos2dx.javascript;

import android.app.Activity;
import android.os.Bundle;
import android.view.Gravity;
import android.widget.TextView;

/** Disposable stand-in used to exercise the lifecycle bootstrap, not the game. */
public final class AppActivity extends Activity {
    private int taps;
    @Override protected void onCreate(Bundle state) {
        super.onCreate(state);
        TextView game = new TextView(this);
        game.setGravity(Gravity.CENTER);
        game.setTextSize(24);
        game.setText("Oyun alanı: 0");
        game.setOnClickListener(v -> game.setText("Oyun alanı: " + ++taps));
        setContentView(game);
    }
}
