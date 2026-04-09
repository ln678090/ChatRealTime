package com.java5.asm.dto.resp.page;


import com.java5.asm.dto.resp.MessageOnConversationResp;
import lombok.*;

import java.util.List;


@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PagedMessageResp {
    private List<MessageOnConversationResp> items;
    private int currentPage;
    private int totalPages;
    private long totalItems;
    private boolean hasNext;
}