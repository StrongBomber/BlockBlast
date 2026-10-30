package ai.arena.blockblast.menu;

import android.view.MotionEvent;
import android.view.View;
import android.view.Window;
import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Proxy;

/** Observe window touch events without consuming or altering the game's input. */
final class ThreeFingerVisibility {
    private ThreeFingerVisibility() {}

    static void install(Window window, View panel) {
        install(window, panel, null);
    }

    static void install(Window window, View panel, Runnable whenHidden) {
        final Window.Callback original = window.getCallback();
        if (original == null) throw new IllegalStateException("Window callback is unavailable");
        final boolean[] toggled = {false};
        Window.Callback observer = (Window.Callback) Proxy.newProxyInstance(
                Window.Callback.class.getClassLoader(), new Class<?>[]{Window.Callback.class},
                (proxy, method, args) -> {
                    if (method.getName().equals("dispatchTouchEvent") && args != null && args.length == 1
                            && args[0] instanceof MotionEvent) {
                        MotionEvent event = (MotionEvent) args[0];
                        int action = event.getActionMasked();
                        if (action == MotionEvent.ACTION_DOWN) toggled[0] = false;
                        if (action == MotionEvent.ACTION_POINTER_DOWN && event.getPointerCount() == 3
                                && !toggled[0]) {
                            panel.setVisibility(panel.getVisibility() == View.VISIBLE ? View.INVISIBLE : View.VISIBLE);
                            if (panel.getVisibility() != View.VISIBLE && whenHidden != null) panel.post(whenHidden);
                            toggled[0] = true;
                        }
                        if (action == MotionEvent.ACTION_UP || action == MotionEvent.ACTION_CANCEL) toggled[0] = false;
                    }
                    try {
                        return method.invoke(original, args);
                    } catch (InvocationTargetException e) {
                        throw e.getCause();
                    }
                });
        window.setCallback(observer);
    }
}
