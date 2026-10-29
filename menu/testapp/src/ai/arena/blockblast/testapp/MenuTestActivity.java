package ai.arena.blockblast.testapp;

import android.app.Activity;
import android.os.Bundle;
import android.view.Gravity;
import android.widget.TextView;
import ai.arena.blockblast.menu.FloatingMenu;

/** Disposable harness for exercising the menu independently of the game. */
public final class MenuTestActivity extends Activity {
    private int taps;

    @Override protected void onCreate(Bundle state) {
        super.onCreate(state);
        TextView game = new TextView(this);
        game.setGravity(Gravity.CENTER);
        game.setTextSize(24);
        game.setText("Oyun alanı: 0");
        game.setOnClickListener(v -> game.setText("Oyun alanı: " + ++taps));
        setContentView(game);
        FloatingMenu.attach(this);
    }
}
