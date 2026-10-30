package ai.arena.blockblast.menu;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.Context;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.text.InputFilter;
import android.text.InputType;
import android.util.Log;
import android.view.Gravity;
import android.view.MotionEvent;
import android.view.View;
import android.view.ViewConfiguration;
import android.view.ViewGroup;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.EditText;
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
        panel.setPadding(dp(activity, 10), dp(activity, 10), dp(activity, 10), dp(activity, 10));
        panel.setBackground(outlined(0xf2192235, 0xff455c80, dp(activity, 16), dp(activity, 1)));
        panel.setElevation(dp(activity, 8));
        FrameLayout.LayoutParams position = new FrameLayout.LayoutParams(dp(activity, 206), -2, Gravity.TOP | Gravity.START);
        position.leftMargin = dp(activity, 12);
        position.topMargin = dp(activity, 80);
        overlay.addView(panel, position);

        Button handle = new Button(activity);
        handle.setText("MOD MENÜ  ▾");
        handle.setContentDescription("Mod menüsünü aç veya kapat; sürükleyerek taşı");
        handle.setAllCaps(false);
        handle.setTextColor(Color.WHITE);
        handle.setTextSize(14);
        handle.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
        handle.setGravity(Gravity.CENTER_VERTICAL | Gravity.START);
        handle.setPadding(dp(activity, 14), 0, dp(activity, 10), 0);
        handle.setMinHeight(0);
        handle.setMinimumHeight(0);
        handle.setBackground(outlined(0xff344c73, 0xff5877ad, dp(activity, 10), dp(activity, 1)));
        panel.addView(handle, new LinearLayout.LayoutParams(-1, dp(activity, 44)));

        TextView credit = new TextView(activity);
        credit.setText("By Raiwesy");
        credit.setTextSize(11);
        credit.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
        credit.setTextColor(0xff9cb9f0);
        credit.setPadding(dp(activity, 4), dp(activity, 6), dp(activity, 4), dp(activity, 2));
        panel.addView(credit);

        LinearLayout options = new LinearLayout(activity);
        options.setOrientation(LinearLayout.VERTICAL);
        ScrollView scroll = new ScrollView(activity);
        scroll.setVisibility(View.GONE);
        scroll.setFillViewport(false);
        scroll.addView(options);
        panel.addView(scroll, new LinearLayout.LayoutParams(-1, -2));
        TextView heading = new TextView(activity);
        heading.setText("SKOR ÇARPANI");
        heading.setTextSize(11);
        heading.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
        heading.setLetterSpacing(0.08f);
        heading.setTextColor(0xff9eb1d0);
        heading.setPadding(dp(activity, 4), dp(activity, 10), 0, dp(activity, 5));
        options.addView(heading);
        TextView status = new TextView(activity);
        status.setTextColor(0xffe4ecfb);
        status.setTextSize(12);
        status.setPadding(dp(activity, 4), 0, dp(activity, 4), dp(activity, 8));
        options.addView(status);

        Button customApply = actionButton(activity, "Özel çarpan gir");
        LinearLayout.LayoutParams customParams = new LinearLayout.LayoutParams(-1, dp(activity, 40));
        customParams.bottomMargin = dp(activity, 5);
        options.addView(customApply, customParams);
        Button comboApply = actionButton(activity, "Kombo değeri gir");
        LinearLayout.LayoutParams comboParams = new LinearLayout.LayoutParams(-1, dp(activity, 40));
        comboParams.bottomMargin = dp(activity, 5);
        options.addView(comboApply, comboParams);
        TextView comboStatus = new TextView(activity);
        comboStatus.setTextColor(0xff9eb1d0);
        comboStatus.setTextSize(10);
        comboStatus.setText("Kombo bir kez ayarlanır, normal kurallarla devam eder.");
        comboStatus.setPadding(dp(activity, 4), 0, dp(activity, 4), dp(activity, 10));
        options.addView(comboStatus);
        comboApply.setOnClickListener(v -> showNumberDialog(activity, panel, "Özel kombo", "Örn. 90",
                "Özel kombo değeri", 0, ComboControl.MAX_COMBO, value -> {
                    ComboControl.request(value);
                    Log.i("ArenaComboMenu", "requested=" + value);
                    comboStatus.setText("Kombo isteği: " + value);
                    comboStatus.postDelayed(() -> {
                        if (ComboControl.getPending() == -1) comboStatus.setText("Kombo ayarlandı: " + value);
                        else comboStatus.setText("Oyun hazır olduğunda uygulanacak: " + value);
                    }, 2500);
                }));

        int[] values = {1, 10, 100, 1000, 10000, 100000};
        Button[] choices = new Button[values.length];
        for (int i = 0; i < values.length; i++) {
            final int value = values[i];
            Button choice = new Button(activity);
            choice.setAllCaps(false);
            choice.setTextSize(13);
            choice.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
            choice.setGravity(Gravity.CENTER_VERTICAL | Gravity.START);
            choice.setPadding(dp(activity, 12), 0, dp(activity, 8), 0);
            choice.setMinHeight(0);
            choice.setMinimumHeight(0);
            choices[i] = choice;
            LinearLayout.LayoutParams choiceParams = new LinearLayout.LayoutParams(-1, dp(activity, 40));
            choiceParams.bottomMargin = dp(activity, 5);
            options.addView(choice, choiceParams);
            choice.setOnClickListener(v -> {
                ScoreMultiplier.set(value);
                prefs.edit().putInt(MULTIPLIER, value).apply();
                updateLabels(activity, choices, values, status);
            });
        }
        updateLabels(activity, choices, values, status);
        customApply.setOnClickListener(v -> showNumberDialog(activity, panel, "Özel çarpan", "Örn. 37",
                "Özel çarpan değeri", 1, Integer.MAX_VALUE, value -> {
                    ScoreMultiplier.set(value);
                    prefs.edit().putInt(MULTIPLIER, value).apply();
                    updateLabels(activity, choices, values, status);
                }));

        TextView hint = new TextView(activity);
        hint.setText("3 parmakla gizle / göster");
        hint.setTextSize(10);
        hint.setTextColor(0xff9eb1d0);
        hint.setPadding(dp(activity, 4), dp(activity, 7), dp(activity, 4), dp(activity, 4));
        options.addView(hint);
        ThreeFingerVisibility.install(activity.getWindow(), panel);

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

    private static void updateLabels(Activity activity, Button[] buttons, int[] values, TextView status) {
        int selected = ScoreMultiplier.get();
        status.setText(selected == 1 ? "Durum: Kapalı" : "Aktif: " + selected + "x");
        for (int i = 0; i < values.length; i++) {
            boolean active = selected == values[i];
            String name = values[i] == 1 ? "Kapalı (1x)" : values[i] + "x";
            buttons[i].setText((active ? "✓  " : "") + name);
            buttons[i].setTextColor(active ? 0xffc6f8ee : 0xffd9e2f2);
            buttons[i].setBackground(outlined(active ? 0xff245b62 : 0xff29364c,
                    active ? 0xff5ecfbb : 0xff364862, dp(activity, 8), dp(activity, 1)));
        }
    }

    private static EditText numberInput(Activity activity, String placeholder) {
        EditText input = new EditText(activity);
        input.setSingleLine(true);
        input.setTextSize(13);
        input.setInputType(InputType.TYPE_CLASS_NUMBER);
        input.setFilters(new InputFilter[]{new InputFilter.LengthFilter(10)});
        input.setTextColor(Color.WHITE);
        input.setHintTextColor(0xff9eb1d0);
        input.setHint(placeholder);
        input.setPadding(dp(activity, 12), 0, dp(activity, 8), 0);
        input.setBackground(outlined(0xff202d42, 0xff536b8e, dp(activity, 8), dp(activity, 1)));
        return input;
    }

    private static Button actionButton(Activity activity, String text) {
        Button button = new Button(activity);
        button.setText(text);
        button.setAllCaps(false);
        button.setTextSize(12);
        button.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
        button.setTextColor(0xffd6f9f2);
        button.setMinHeight(0);
        button.setMinimumHeight(0);
        button.setBackground(outlined(0xff245b62, 0xff5ecfbb, dp(activity, 8), dp(activity, 1)));
        return button;
    }

    private static Integer parseInput(EditText input, int min, int max) {
        try {
            long value = Long.parseLong(input.getText().toString().trim());
            if (value < min || value > max) throw new NumberFormatException();
            return (int) value;
        } catch (NumberFormatException ex) {
            input.setError("Geçerli aralık: " + min + "–" + max);
            return null;
        }
    }

    private interface NumberAction { void apply(int value); }

    private static void showNumberDialog(Activity activity, View panel, String title, String placeholder,
                                         String description, int min, int max, NumberAction action) {
        EditText input = numberInput(activity, placeholder);
        input.setContentDescription(description);
        LinearLayout container = new LinearLayout(activity);
        container.setPadding(dp(activity, 24), dp(activity, 8), dp(activity, 24), dp(activity, 8));
        container.addView(input, new LinearLayout.LayoutParams(-1, dp(activity, 48)));
        AlertDialog dialog = new AlertDialog.Builder(activity).setTitle(title).setView(container)
                .setNegativeButton("İptal", null).setPositiveButton("Uygula", null).create();
        dialog.setOnShowListener(ignored -> {
            ThreeFingerVisibility.install(dialog.getWindow(), panel, dialog::dismiss);
            dialog.getButton(AlertDialog.BUTTON_POSITIVE).setOnClickListener(v -> {
                Integer value = parseInput(input, min, max);
                if (value == null) return;
                action.apply(value);
                dialog.dismiss();
            });
            input.requestFocus();
            dialog.getWindow().setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_STATE_ALWAYS_VISIBLE
                    | WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE);
        });
        dialog.show();
    }

    private static int dp(Context context, int value) {
        return Math.round(value * context.getResources().getDisplayMetrics().density);
    }

    private static GradientDrawable outlined(int color, int stroke, int radius, int width) {
        GradientDrawable drawable = new GradientDrawable();
        drawable.setColor(color);
        drawable.setCornerRadius(radius);
        drawable.setStroke(width, stroke);
        return drawable;
    }
}
