package com.java5.asm.dto.resp;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ApiResp<T> {
    private String code;
    private String message;
    private T data;
    private String timestamp;
}
