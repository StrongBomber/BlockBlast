package ai.arena.blockblast.menu;

import android.app.Activity;
import android.content.Context;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.graphics.drawable.GradientDrawable;
import android.view.Gravity;
import android.view.MotionEvent;
import android.view.View;
import android.view.ViewConfiguration;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;

/** In-activity floating controls. No system overlay permission is requested. */
public final class FloatingMenu {
    private static final String TAG = "arena.blockblast.score.menu";
    private static final String PREFS = "arena_score_menu";
    private static final String MULTIPLIER = "multiplier";

    private FloatingMenu() {}

    /** Must be called on the activity's UI thread after its content view is created. */
    public static void attach(Activity activity) {
        ViewGroup content = activity.findViewById(android.R.id.content);
        if (content == null) throw new IllegalStateException("Activity content is not ready");
        if (content.findViewWithTag(TAG) != null) return;
        SharedPreferences prefs = activity.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        int saved = prefs.getInt(MULTIPLIER, 1);
        ScoreMultiplier.set(ScoreMultiplier.isSupported(saved) ? saved : 1);

        FrameLayout overlay = new FrameLayout(activity);
        overlay.setTag(TAG);
        overlay.setClipChildren(false);
        content.addView(overlay, new ViewGroup.LayoutParams(-1, -1));

        LinearLayout panel = new LinearLayout(activity);
        panel.setOrientation(LinearLayout.VERTICAL);
        panel.setPadding(dp(activity, 8), dp(activity, 8), dp(activity, 8), dp(activity, 8));
        panel.setBackground(background(0xe6293347, dp(activity, 12)));
        FrameLayout.LayoutParams position = new FrameLayout.LayoutParams(dp(activity, 176), -2, Gravity.TOP | Gravity.START);
        position.leftMargin = dp(activity, 12);
        position.topMargin = dp(activity, 80);
        overlay.addView(panel, position);

        Button handle = new Button(activity);
        handle.setText("MOD MENÜ  ▾");
        handle.setContentDescription("Mod menüsünü aç veya kapat; sürükleyerek taşı");
        handle.setAllCaps(false);
        panel.addView(handle, new LinearLayout.LayoutParams(-1, -2));

        LinearLayout options = new LinearLayout(activity);
        options.setOrientation(LinearLayout.VERTICAL);
        ScrollView scroll = new ScrollView(activity);
        scroll.setVisibility(View.GONE);
        scroll.setFillViewport(false);
        scroll.addView(options);
        panel.addView(scroll, new LinearLayout.LayoutParams(-1, -2));
        TextView heading = new TextView(activity);
        heading.setText("Skor çarpanı");
        heading.setTextColor(Color.WHITE);
        heading.setPadding(dp(activity, 4), dp(activity, 8), 0, dp(activity, 4));
        options.addView(heading);

        int[] values = {1, 10, 100, 1000};
        Button[] choices = new Button[values.length];
        for (int i = 0; i < values.length; i++) {
            final int value = values[i];
            Button choice = new Button(activity);
            choice.setAllCaps(false);
            choices[i] = choice;
            options.addView(choice, new LinearLayout.LayoutParams(-1, -2));
            choice.setOnClickListener(v -> {
                ScoreMultiplier.set(value);
                prefs.edit().putInt(MULTIPLIER, value).apply();
                updateLabels(choices, values);
            });
        }
        updateLabels(choices, values);

        final int threshold = ViewConfiguration.get(activity).getScaledTouchSlop();
        handle.setOnTouchListener(new View.OnTouchListener() {
            private float downX, downY;
            private int startLeft, startTop;
            private boolean moved;
            @Override public boolean onTouch(View view, MotionEvent event) {
                FrameLayout.LayoutParams lp = (FrameLayout.LayoutParams) panel.getLayoutParams();
                switch (event.getActionMasked()) {
                    case MotionEvent.ACTION_DOWN:
                        downX = event.getRawX(); downY = event.getRawY();
                        startLeft = lp.leftMargin; startTop = lp.topMargin; moved = false;
                        return true;
                    case MotionEvent.ACTION_MOVE:
                        float dx = event.getRawX() - downX, dy = event.getRawY() - downY;
                        if (Math.abs(dx) > threshold || Math.abs(dy) > threshold) moved = true;
                        if (moved) {
                            lp.leftMargin = Math.max(0, Math.min(overlay.getWidth() - panel.getWidth(), startLeft + (int) dx));
                            lp.topMargin = Math.max(0, Math.min(overlay.getHeight() - panel.getHeight(), startTop + (int) dy));
                            panel.setLayoutParams(lp);
                        }
                        return true;
                    case MotionEvent.ACTION_UP:
                        if (!moved) view.performClick();
                        return true;
                    case MotionEvent.ACTION_CANCEL:
                        return true;
                    default:
                        return true;
                }
            }
        });
        panel.addOnLayoutChangeListener((v, left, top, right, bottom, oldLeft, oldTop, oldRight, oldBottom) -> {
            FrameLayout.LayoutParams lp = (FrameLayout.LayoutParams) panel.getLayoutParams();
            int x = Math.max(0, Math.min(lp.leftMargin, overlay.getWidth() - panel.getWidth()));
            int y = Math.max(0, Math.min(lp.topMargin, overlay.getHeight() - panel.getHeight()));
            if (x != lp.leftMargin || y != lp.topMargin) {
                lp.leftMargin = x; lp.topMargin = y;
                panel.setLayoutParams(lp);
            }
        });
        handle.setOnClickListener(v -> {
            boolean opening = scroll.getVisibility() != View.VISIBLE;
            if (opening) {
                LinearLayout.LayoutParams lp = (LinearLayout.LayoutParams) scroll.getLayoutParams();
                lp.height = Math.max(dp(activity, 96), Math.min(dp(activity, 280), overlay.getHeight() - handle.getHeight() - dp(activity, 16)));
                scroll.setLayoutParams(lp);
            }
            scroll.setVisibility(opening ? View.VISIBLE : View.GONE);
            handle.setText(opening ? "MOD MENÜ  ▴" : "MOD MENÜ  ▾");
        });
    }

    private static void updateLabels(Button[] buttons, int[] values) {
        for (int i = 0; i < values.length; i++) {
            String name = values[i] == 1 ? "Kapalı (1x)" : values[i] + "x";
            buttons[i].setText((ScoreMultiplier.get() == values[i] ? "✓  " : "") + name);
        }
    }

    private static int dp(Context context, int value) {
        return Math.round(value * context.getResources().getDisplayMetrics().density);
    }

    private static GradientDrawable background(int color, int radius) {
        GradientDrawable drawable = new GradientDrawable();
        drawable.setColor(color);
        drawable.setCornerRadius(radius);
        return drawable;
    }
}
