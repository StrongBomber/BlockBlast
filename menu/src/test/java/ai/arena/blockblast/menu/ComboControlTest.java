package ai.arena.blockblast.menu;

public final class ComboControlTest {
    private static void check(boolean value) { if (!value) throw new AssertionError(); }
    public static void main(String[] args) {
        check(ComboControl.getPending() == -1);
        ComboControl.request(90);
        check(ComboControl.getPending() == 90);
        ComboControl.request(91);
        ComboControl.acknowledge(90);
        check(ComboControl.getPending() == 91);
        ComboControl.acknowledge(91);
        check(ComboControl.getPending() == -1);
        ComboControl.request(0);
        ComboControl.acknowledge(0);
        ComboControl.request(ComboControl.MAX_COMBO);
        ComboControl.acknowledge(ComboControl.MAX_COMBO);
        for (int invalid : new int[]{-1, ComboControl.MAX_COMBO + 1}) {
            try { ComboControl.request(invalid); throw new AssertionError("Invalid combo accepted"); }
            catch (IllegalArgumentException expected) { check(ComboControl.getPending() == -1); }
        }
        System.out.println("ComboControl tests passed");
    }
}
