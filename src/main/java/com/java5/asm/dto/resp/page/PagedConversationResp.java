package com.java5.asm.dto.resp.page;

import com.java5.asm.dto.resp.ConversationResp;
import lombok.*;

import java.util.List;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PagedConversationResp {
    private List<ConversationResp> items;
    private int currentPage;
    private int totalPages;
    private long totalItems;
    private boolean hasNext;
}
