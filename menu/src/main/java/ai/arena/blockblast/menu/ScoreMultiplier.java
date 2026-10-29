package ai.arena.blockblast.menu;

/** Score multiplier state and arithmetic, independent of Android UI. */
public final class ScoreMultiplier {
    private static volatile int current = 1;

    private ScoreMultiplier() {}

    public static boolean isSupported(int value) {
        return value == 1 || value == 10 || value == 100 || value == 1000;
    }

    public static void set(int value) {
        if (!isSupported(value)) throw new IllegalArgumentException("Unsupported multiplier");
        current = value;
    }

    public static int get() {
        return current;
    }

    /** Multiply a score award, not the accumulated score or negative penalties. */
    public static int applyToAward(int delta) {
        if (delta <= 0) return delta;
        long result = (long) delta * current;
        return result > Integer.MAX_VALUE ? Integer.MAX_VALUE : (int) result;
    }
}
