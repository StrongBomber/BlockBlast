package ai.arena.blockblast.menu;

public final class ScoreMultiplierTest {
    private static void check(boolean condition) {
        if (!condition) throw new AssertionError();
    }

    public static void main(String[] args) {
        for (int multiplier : new int[] {1, 10, 100, 1000, 10000, 100000}) {
            ScoreMultiplier.set(multiplier);
            check(ScoreMultiplier.get() == multiplier);
            check(ScoreMultiplier.applyToAward(7) == 7 * multiplier);
            check(ScoreMultiplier.applyToAward(0) == 0);
            check(ScoreMultiplier.applyToAward(-3) == -3);
        }
        check(ScoreMultiplier.applyToAward(Integer.MAX_VALUE) == Integer.MAX_VALUE);
        try {
            ScoreMultiplier.set(0);
            throw new AssertionError("Invalid setting accepted");
        } catch (IllegalArgumentException expected) {
            check(ScoreMultiplier.get() == 100000);
        }
        ScoreMultiplier.set(1);
        System.out.println("ScoreMultiplier tests passed");
    }
}
