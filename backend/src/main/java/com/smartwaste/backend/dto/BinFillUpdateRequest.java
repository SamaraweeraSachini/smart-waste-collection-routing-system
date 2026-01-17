package com.smartwaste.backend.dto;

public class BinFillUpdateRequest {
    private int fillLevel; // 0 - 100

    public int getFillLevel() {
        return fillLevel;
    }

    public void setFillLevel(int fillLevel) {
        this.fillLevel = fillLevel;
    }
}
