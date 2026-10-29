import android.os.SystemClock;
import android.view.InputDevice;
import android.view.InputEvent;
import android.view.MotionEvent;
import java.lang.reflect.Method;

/** Test-only shell helper: inject real multi-pointer events into the focused window. */
public final class InjectMultiTouch {
    public static void main(String[] args) throws Exception {
        int count = Integer.parseInt(args[0]);
        boolean retouch = args.length > 1 && args[1].equals("retouch");
        if (count < 1 || count > 3) throw new IllegalArgumentException("Expected 1-3 pointers");
        Class<?> cls = Class.forName("android.hardware.input.InputManager");
        Method getInstance = cls.getDeclaredMethod("getInstance");
        getInstance.setAccessible(true);
        Object manager = getInstance.invoke(null);
        Method inject = cls.getDeclaredMethod("injectInputEvent", InputEvent.class, int.class);
        inject.setAccessible(true);
        long down = SystemClock.uptimeMillis();
        send(manager, inject, down, MotionEvent.ACTION_DOWN, 1);
        for (int i = 1; i < count; i++)
            send(manager, inject, down, MotionEvent.ACTION_POINTER_DOWN | (i << MotionEvent.ACTION_POINTER_INDEX_SHIFT), i + 1);
        send(manager, inject, down, MotionEvent.ACTION_MOVE, count);
        if (count == 3 && retouch) {
            send(manager, inject, down, MotionEvent.ACTION_POINTER_UP | (2 << MotionEvent.ACTION_POINTER_INDEX_SHIFT), 3);
            send(manager, inject, down, MotionEvent.ACTION_POINTER_DOWN | (2 << MotionEvent.ACTION_POINTER_INDEX_SHIFT), 3);
        }
        for (int i = count - 1; i > 0; i--)
            send(manager, inject, down, MotionEvent.ACTION_POINTER_UP | (i << MotionEvent.ACTION_POINTER_INDEX_SHIFT), i + 1);
        send(manager, inject, down, MotionEvent.ACTION_UP, 1);
    }

    private static void send(Object manager, Method inject, long down, int action, int count) throws Exception {
        MotionEvent.PointerProperties[] properties = new MotionEvent.PointerProperties[count];
        MotionEvent.PointerCoords[] coordinates = new MotionEvent.PointerCoords[count];
        for (int i = 0; i < count; i++) {
            properties[i] = new MotionEvent.PointerProperties();
            properties[i].id = i;
            properties[i].toolType = MotionEvent.TOOL_TYPE_FINGER;
            coordinates[i] = new MotionEvent.PointerCoords();
            coordinates[i].x = 550 + i * 30;
            coordinates[i].y = 200;
            coordinates[i].pressure = 1;
            coordinates[i].size = 1;
        }
        MotionEvent event = MotionEvent.obtain(down, SystemClock.uptimeMillis(), action, count,
                properties, coordinates, 0, 0, 1, 1, 0, 0, InputDevice.SOURCE_TOUCHSCREEN, 0);
        try {
            if (!Boolean.TRUE.equals(inject.invoke(manager, event, 2))) throw new AssertionError("Input injection failed");
        } finally {
            event.recycle();
        }
    }
}
