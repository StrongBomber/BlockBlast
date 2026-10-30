package ai.arena.blockblast.menu;

/** One-shot request consumed on the game's GL thread, not a permanent combo lock. */
public final class ComboControl {
    public static final int MAX_COMBO = 1_000_000;
    private static int pending = -1;

    private ComboControl() {}

    public static synchronized void request(int value) {
        if (value < 0 || value > MAX_COMBO) throw new IllegalArgumentException("Unsupported combo");
        pending = value;
    }

    public static synchronized int getPending() {
        return pending;
    }

    /** Do not discard a different request made while the previous one was being applied. */
    public static synchronized void acknowledge(int applied) {
        if (pending == applied) pending = -1;
    }
}
