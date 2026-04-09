package com.java5.asm.service.admin.impl;

import com.java5.asm.dto.common.PageResponse;
import com.java5.asm.dto.req.AdminReq;
import com.java5.asm.dto.resp.BlacklistWordDTO;
import com.java5.asm.entity.BlacklistWord;
import com.java5.asm.repository.BlacklistWordRepository;
import com.java5.asm.service.admin.AdminBlacklistService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class AdminBlacklistServiceImpl implements AdminBlacklistService {
    private final BlacklistWordRepository repository;

    @Override
    @Transactional(readOnly = true)
    public PageResponse<BlacklistWordDTO> getBlacklist(String query, String status, Pageable pageable) {
        Specification<BlacklistWord> spec = (root, cq, cb) -> {
            var p = cb.conjunction();
            if (query != null && !query.isBlank()) {
                p = cb.and(p, cb.like(cb.lower(root.get("keyword")), "%" + query.toLowerCase() + "%"));
            }
            if ("DELETED".equalsIgnoreCase(status)) {
                p = cb.and(p, cb.isTrue(root.get("isDeleted")));
            } else {
                p = cb.and(p, cb.isFalse(root.get("isDeleted")));
                if ("ACTIVE".equalsIgnoreCase(status)) p = cb.and(p, cb.isTrue(root.get("isActive")));
                if ("INACTIVE".equalsIgnoreCase(status)) p = cb.and(p, cb.isFalse(root.get("isActive")));
            }
            return p;
        };
        Page<BlacklistWord> page = repository.findAll(spec, pageable);

        // Map từ Entity sang DTO
        Page<BlacklistWordDTO> dtoPage = page.map(word -> {
            BlacklistWordDTO dto = new BlacklistWordDTO();
            dto.setId(word.getId());
            dto.setKeyword(word.getKeyword());
            dto.setSeverity(word.getSeverity());
            dto.setIsActive(word.getIsActive());
            dto.setIsDeleted(word.getIsDeleted());

            // Cần thông tin người tạo thì gán tay tên/email thôi
            if (word.getCreatedBy() != null) {
                dto.setCreatorName(word.getCreatedBy().getFullName());
            }
            return dto;
        });

        return PageResponse.of(dtoPage);
    }

    @Transactional
    @Override
    public BlacklistWord createWord(AdminReq.BlacklistReq req, UUID adminId) {
        String normalizedKeyword = req.getKeyword().trim().toLowerCase();
        if (repository.existsByKeywordIgnoreCaseAndIsDeletedFalse(normalizedKeyword)) {
            throw new RuntimeException("Từ khóa này đã tồn tại trong danh sách đen");
        }


        BlacklistWord word = new BlacklistWord();
        word.setKeyword(normalizedKeyword);
        word.setSeverity(req.getSeverity() != null ? req.getSeverity() : 1);
        word.setIsActive(req.getActive() != null ? req.getActive() : true);

      
        word.setIsDeleted(false);
        word.setCreatedAt(OffsetDateTime.now());
        word.setUpdatedAt(OffsetDateTime.now());

        log.info("AUDIT: Admin [{}] CREATE blacklist word [{}]", adminId, normalizedKeyword);
//        return repository.save(word);

//        log.info("AUDIT: Admin [{}] CREATE blacklist word [{}]", adminId, normalizedKeyword);
        return repository.save(word);
    }

    @Transactional
    @Override
    public void softDelete(UUID id, UUID adminId) {
        BlacklistWord word = repository.findById(id).orElseThrow(() -> new RuntimeException("Không tìm thấy từ khóa"));
        word.setIsDeleted(true);
        word.setDeletedAt(OffsetDateTime.now());
        repository.save(word);
        log.info("AUDIT: Admin [{}] SOFT DELETE blacklist word id=[{}]", adminId, id);
    }

    /**
     * @param id
     * @param req
     * @param adminId
     * @return
     */
    @Override
    @Transactional
    public Object updateWord(UUID id, AdminReq.BlacklistReq req, UUID adminId) {
        BlacklistWord word = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy từ khóa cấm"));

        word.setKeyword(req.getKeyword());
        // Lưu ý: Tùy kiểu dữ liệu của Severity (enum hay String) mà parse cho đúng
        word.setSeverity(req.getSeverity());
        // word.setUpdatedAt(OffsetDateTime.now()); (nếu có)

        return repository.save(word);
    }

    @Override
    @Transactional
    public void toggleActive(UUID id, Boolean isActive, UUID adminId) {
        BlacklistWord word = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy từ khóa cấm"));

        word.setIsActive(isActive);
        repository.save(word);
    }
}
