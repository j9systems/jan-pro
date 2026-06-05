"use client";

import { useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RotateCcw, Save } from "lucide-react";
import { ISSA_RATE_LEVELS, FLOOR_TYPES_V3 } from "@/lib/constants";

type RateRow = {
  floorType: string;
  label: string;
  levels: [number, number, number, number, number];
};

function buildDefaultRows(): RateRow[] {
  return FLOOR_TYPES_V3.map(({ value, label }) => ({
    floorType: value,
    label,
    levels: [...(ISSA_RATE_LEVELS[value] ?? [0, 0, 0, 0, 0])] as [number, number, number, number, number],
  }));
}

export default function RatesSettingsPage() {
  const [rows, setRows] = useState<RateRow[]>(buildDefaultRows);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const handleChange = useCallback(
    (floorType: string, levelIndex: number, value: string) => {
      const num = parseInt(value, 10);
      setRows((prev) =>
        prev.map((row) => {
          if (row.floorType !== floorType) return row;
          const newLevels = [...row.levels] as [number, number, number, number, number];
          newLevels[levelIndex] = isNaN(num) ? 0 : num;
          return { ...row, levels: newLevels };
        })
      );
      setDirty(true);
    },
    []
  );

  const handleSave = async () => {
    setSaving(true);
    // TODO: upsert rows to production_rate_config table
    // For now, just simulate a save
    await new Promise((r) => setTimeout(r, 500));
    setSaving(false);
    setDirty(false);
  };

  const handleReset = () => {
    setRows(buildDefaultRows());
    setDirty(true);
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-janpro-navy">
          Production Rates
        </h2>
        <p className="text-sm text-muted-foreground">
          ISSA production rate levels per floor type (sq ft / hr). Level 1 =
          heavily obstructed, Level 5 = unobstructed.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">
              ISSA Rate Levels by Floor Type
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleReset}
                className="h-8 text-xs"
              >
                <RotateCcw className="h-3 w-3 mr-1.5" />
                Reset to Defaults
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={!dirty || saving}
                className="h-8 text-xs"
              >
                <Save className="h-3 w-3 mr-1.5" />
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="text-left py-2.5 px-3 font-medium text-muted-foreground w-48">
                    Floor Type
                  </th>
                  {[1, 2, 3, 4, 5].map((level) => (
                    <th
                      key={level}
                      className="text-center py-2.5 px-3 font-medium text-muted-foreground"
                    >
                      Level {level}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.floorType}
                    className="border-b border-border/30 last:border-0"
                  >
                    <td className="py-2 px-3 font-medium text-foreground">
                      {row.label}
                    </td>
                    {row.levels.map((val, i) => (
                      <td key={i} className="py-2 px-3">
                        <Input
                          type="number"
                          value={val}
                          onChange={(e) =>
                            handleChange(row.floorType, i, e.target.value)
                          }
                          className="h-8 text-xs text-center w-24 mx-auto"
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
