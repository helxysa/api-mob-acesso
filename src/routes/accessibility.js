import express from "express";
import { supabase } from "../src/config/supabase.js";

const router = express.Router();

router.post("/points", async (req, res) => {
  try {
    const { latitude, longitude, name, features } = req.body;

    const { data: point, error: pointError } = await supabase
      .from("accessibility_points")
      .insert({
        latitude,
        longitude,
        name,
        status: "pending",
      })
      .select()
      .single();

    if (pointError) throw pointError;

    const featuresData = features.map((feature) => ({
      point_id: point.id,
      feature_type: feature.type,
      description: feature.description,
    }));

    const { error: featuresError } = await supabase
      .from("accessibility_features")
      .insert(featuresData);

    if (featuresError) throw featuresError;

    res.status(201).json(point);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/points", async (req, res) => {
  try {
    const { minLat, maxLat, minLng, maxLng } = req.query;

    const { data: points, error } = await supabase
      .from("accessibility_points")
      .select(
        `
        *,
        accessibility_features (*)
      `
      )
      .gte("latitude", minLat)
      .lte("latitude", maxLat)
      .gte("longitude", minLng)
      .lte("longitude", maxLng);

    if (error) throw error;

    res.json(points);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
